using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Routiq.Api.Data;

namespace Routiq.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly RoutiqDbContext _context;

    public AnalyticsController(RoutiqDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAnalytics()
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

            // Fetch user profile for preferences
            var profile = await _context.UserProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            // 1. Total Group Savings (based on saved routes vs budget)
            var savings = await CalculateUserSavingsAsync(userId);

            // 2. Carbon Footprint Estimate
            var carbonMetrics = await CalculateCarbonFootprintAsync(userId);

            // 3. Popular Regions (from saved route stops)
            var popularRegions = await CalculatePopularRegionsAsync(userId);

            // 4. Travel Groups count
            var travelGroupsCount = await _context.TravelGroupMembers
                .Where(m => m.UserId == userId)
                .CountAsync();

            // 5. Total Trips (saved routes = travel frequency)
            var totalTripsCount = await _context.SavedRoutes
                .Where(sr => sr.UserId == userId)
                .CountAsync();

            // 6. Recent Activity — last 5 saved routes with dates
            var recentActivity = await _context.SavedRoutes
                .Where(sr => sr.UserId == userId)
                .OrderByDescending(sr => sr.SavedAt)
                .Take(5)
                .Select(sr => new
                {
                    routeName = sr.RouteName,
                    savedAt = sr.SavedAt,
                    status = sr.Status.ToString()
                })
                .ToListAsync();

            return Ok(new
            {
                totalGroupSavings = savings,
                carbonFootprintEstimate = carbonMetrics,
                popularRegions,
                travelGroupsCount,
                totalTripsCount,
                recentActivity,
                preferredCurrency = profile?.PreferredCurrency ?? "USD",
                unitPreference = profile?.UnitPreference ?? "Metric"
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private async Task<double> CalculateUserSavingsAsync(int userId)
    {
        // Real savings require actual travel cost data which isn't tracked yet.
        // Return the total budget allocated across saved routes as a baseline metric.
        var totalBudget = await _context.SavedRoutes
            .Include(sr => sr.RouteQuery)
            .Where(sr => sr.UserId == userId
                && (sr.Status == Entities.RouteStatus.Active || sr.Status == Entities.RouteStatus.Traveled || sr.Status == Entities.RouteStatus.Saved)
                && sr.RouteQuery != null && sr.RouteQuery.TotalBudgetUsd > 0)
            .SumAsync(sr => (double)sr.RouteQuery!.TotalBudgetUsd);

        return totalBudget;
    }

    private async Task<object> CalculateCarbonFootprintAsync(int userId)
    {
        // Count saved trips; estimate ~115g CO2 per passenger-km, avg 2000km round-trip per route
        var userRoutesCount = await _context.SavedRoutes
           .Where(sr => sr.UserId == userId)
           .CountAsync();

        double estimatedKgCo2 = userRoutesCount * 230.0; // 2000km * 0.115 kg/km

        return new
        {
            totalKgCo2 = estimatedKgCo2,
            tripsTracked = userRoutesCount
        };
    }

    private async Task<List<object>> CalculatePopularRegionsAsync(int userId)
    {
        // Query the actual saved destinations (via RouteStops) or fallback to static list if none
        var regions = await _context.RouteStops
            .Include(rs => rs.SavedRoute)
            .Include(rs => rs.Destination)
            .Where(rs => rs.SavedRoute!.UserId == userId && rs.Destination != null)
            .GroupBy(rs => rs.Destination!.Region)
            .Select(g => new { Region = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToListAsync();

        return regions.Select(r => new { name = r.Region, value = r.Count } as object).ToList();
    }
}
