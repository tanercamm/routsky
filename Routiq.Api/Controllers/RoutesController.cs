using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Routiq.Api.Data;
using Routiq.Api.DTOs;
using Routiq.Api.Entities;
using Routiq.Api.Services;

namespace Routiq.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoutesController : ControllerBase
{
    private readonly RoutiqDbContext _context;

    public RoutesController(RoutiqDbContext context)
    {
        _context = context;
    }


    /// <summary>
    /// Saves a route (from the engine's output) to the user's profile.
    /// </summary>
    [Authorize]
    [HttpPost("save")]
    public async Task<IActionResult> SaveRoute([FromBody] SaveRouteDto request)
    {
        // 1. JWT IDENTITY EXTRACTION
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdStr, out int currentUserId))
            return Unauthorized("Invalid or missing user token.");

        // 2. OVERRIDE TRIVIAL/MALICIOUS DATA FROM BODY
        request.UserId = currentUserId;

        var user = await _context.Users.FindAsync(request.UserId);
        if (user == null)
            return NotFound("User not found.");

        // Create the RouteQuery record
        var query = new RouteQuery
        {
            Id = Guid.NewGuid(),
            UserId = request.UserId,
            Passports = request.Passports,
            BudgetBracket = request.BudgetBracket,
            TotalBudgetUsd = request.TotalBudgetUsd,
            DurationDays = request.DurationDays,
            RegionPreference = request.RegionPreference,
            HasSchengenVisa = request.HasSchengenVisa,
            HasUsVisa = request.HasUsVisa,
            HasUkVisa = request.HasUkVisa,
            CreatedAt = DateTime.UtcNow
        };

        var savedRoute = new SavedRoute
        {
            Id = Guid.NewGuid(),
            UserId = request.UserId,
            RouteQueryId = query.Id,
            RouteName = request.RouteName,
            Status = RouteStatus.Saved,
            SelectionReason = request.SelectionReason,
            SavedAt = DateTime.UtcNow
        };

        // Resolve DestinationId server-side from City+CountryCode.
        // CRITICAL: DestinationId is a non-nullable FK — never write 0; skip unresolvable stops.
        var stops = new List<RouteStop>();
        var unresolvedCities = new List<string>();

        foreach (var s in request.Stops)
        {
            int? destId = (s.DestinationId.HasValue && s.DestinationId.Value > 0)
                ? s.DestinationId
                : null;

            if (destId == null && !string.IsNullOrWhiteSpace(s.City))
            {
                var dest = await _context.Destinations
                    .FirstOrDefaultAsync(d =>
                        d.City == s.City &&
                        d.CountryCode == s.CountryCode);
                destId = dest?.Id;
            }

            if (destId == null || destId.Value <= 0)
            {
                unresolvedCities.Add($"{s.City} ({s.CountryCode})");
                continue; // FK would be violated — skip this stop
            }

            if (!Enum.TryParse<CostLevel>(s.ExpectedCostLevel.ToString(), ignoreCase: true, out var costLevel))
                costLevel = CostLevel.Medium;

            stops.Add(new RouteStop
            {
                SavedRouteId = savedRoute.Id,
                DestinationId = destId.Value,
                StopOrder = s.StopOrder,
                RecommendedDays = s.RecommendedDays,
                ExpectedCostLevel = costLevel,
                StopReason = s.StopReason
            });
        }

        _context.RouteQueries.Add(query);
        _context.SavedRoutes.Add(savedRoute);
        if (stops.Count > 0)
            _context.RouteStops.AddRange(stops);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            Message = "Route saved successfully.",
            RouteId = savedRoute.Id,
            StopsSaved = stops.Count,
            UnresolvedStops = unresolvedCities // debug: tells frontend which cities weren't in DB
        });
    }

    /// <summary>
    /// Lightweight save for orchestrator/discover routes.
    /// Creates a minimal RouteQuery + SavedRoute without requiring FK-resolved stops.
    /// </summary>
    [Authorize]
    [HttpPost("save-discover")]
    public async Task<IActionResult> SaveDiscoverRoute([FromBody] SaveDiscoverRouteDto request)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdStr, out int currentUserId))
            return Unauthorized("Invalid or missing user token.");

        var user = await _context.Users.FindAsync(currentUserId);
        if (user == null)
            return NotFound("User not found.");

        // Check for duplicate saved routes (same user + same destination)
        var existingRoute = await _context.SavedRoutes
            .AnyAsync(sr => sr.UserId == currentUserId && sr.RouteName == $"{request.DestinationCity}, {request.DestinationCountry}");
        if (existingRoute)
            return Ok(new { Message = "Route already saved.", AlreadySaved = true });

        var query = new RouteQuery
        {
            Id = Guid.NewGuid(),
            UserId = currentUserId,
            Passports = new List<string> { request.Passport },
            BudgetBracket = BudgetBracket.Mid,
            TotalBudgetUsd = request.TotalBudgetUsd,
            DurationDays = request.DurationDays,
            RegionPreference = RegionPreference.Any,
            CreatedAt = DateTime.UtcNow
        };

        var savedRoute = new SavedRoute
        {
            Id = Guid.NewGuid(),
            UserId = currentUserId,
            RouteQueryId = query.Id,
            RouteName = $"{request.DestinationCity}, {request.DestinationCountry}",
            Status = RouteStatus.Saved,
            SelectionReason = !string.IsNullOrWhiteSpace(request.SelectionReason)
                ? request.SelectionReason
                : $"Orchestrator selected {request.DestinationCity} ({request.DestinationCode}) for ${request.TotalBudgetUsd} budget, {request.DurationDays} days.",
            SavedAt = DateTime.UtcNow
        };

        _context.RouteQueries.Add(query);
        _context.SavedRoutes.Add(savedRoute);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            Message = "Route saved successfully.",
            RouteId = savedRoute.Id,
            RouteName = savedRoute.RouteName
        });
    }

    /// <summary>
    /// Returns all saved routes for a given user, including their ordered stops.
    /// </summary>
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<List<SavedRouteResponseDto>>> GetUserRoutes(int userId)
    {
        var currentUserIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(currentUserIdStr, out int currentUserId) || currentUserId != userId)
        {
            return Forbid();
        }

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return NotFound($"User with ID {userId} not found.");

        try
        {
            var routes = await _context.SavedRoutes
                .Where(sr => sr.UserId == userId)
                .Include(sr => sr.RouteQuery)
                .Include(sr => sr.Stops)
                    .ThenInclude(s => s.Destination)
                .OrderByDescending(sr => sr.SavedAt)
                .ToListAsync();

            var result = routes.Select(sr => new SavedRouteResponseDto
            {
                Id = sr.Id,
                UserId = sr.UserId,
                RouteName = sr.RouteName,
                Status = sr.Status.ToString(),
                SelectionReason = sr.SelectionReason,
                SavedAt = sr.SavedAt,
                TotalBudgetUsd = sr.RouteQuery?.TotalBudgetUsd ?? 0,
                DurationDays = sr.RouteQuery?.DurationDays ?? 0,
                Passports = sr.RouteQuery?.Passports ?? new List<string>(),
                Stops = (sr.Stops ?? new List<RouteStop>())
                    .OrderBy(s => s.StopOrder)
                    .Select(s => new RouteStopDto
                    {
                        Order = s.StopOrder,
                        City = s.Destination?.City ?? "",
                        Country = s.Destination?.Country ?? "",
                        CountryCode = s.Destination?.CountryCode ?? "",
                        Region = s.Destination?.Region ?? "",
                        RecommendedDays = s.RecommendedDays,
                        CostLevel = s.ExpectedCostLevel.ToString(),
                        StopReason = s.StopReason
                    }).ToList()
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                Error = "Failed to load saved routes.",
                Detail = ex.Message,
                InnerDetail = ex.InnerException?.Message
            });
        }
    }

    /// <summary>
    /// Marks a saved route as Active (user is currently on this trip).
    /// Deactivates all other routes for the same user.
    /// </summary>
    [HttpPut("{routeId}/set-active")]
    public async Task<IActionResult> SetActiveRoute(Guid routeId)
    {
        var route = await _context.SavedRoutes.FindAsync(routeId);
        if (route == null)
            return NotFound("Route not found.");

        var userRoutes = await _context.SavedRoutes
            .Where(sr => sr.UserId == route.UserId)
            .ToListAsync();

        foreach (var r in userRoutes)
            r.Status = r.Id == routeId ? RouteStatus.Active : RouteStatus.Saved;

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Route set as active.", RouteId = route.Id });
    }

    /// <summary>
    /// Submits a structured TraveledRoute record for a saved route.
    /// This is the community feedback loop — structured enums only, 3 capped free-text fields.
    /// </summary>
    [HttpPost("{routeId}/traveled")]
    public async Task<IActionResult> MarkAsTraveled(Guid routeId, [FromBody] SubmitTraveledRouteDto dto)
    {
        var route = await _context.SavedRoutes.FindAsync(routeId);
        if (route == null)
            return NotFound("Route not found.");

        if (route.TraveledRoute != null)
            return Conflict("A traveled record already exists for this route.");

        var traveledRoute = new TraveledRoute
        {
            Id = Guid.NewGuid(),
            SavedRouteId = routeId,
            TraveledAt = dto.TraveledAt,
            TransportExpense = dto.TransportExpense,
            FoodExpense = dto.FoodExpense,
            AccommodationExpense = dto.AccommodationExpense,
            VisaExperience = dto.VisaExperience,
            DaySufficiencyJson = dto.DaySufficiencyJson,
            WhyThisRegion = dto.WhyThisRegion,
            WhatWasChallenging = dto.WhatWasChallenging,
            WhatIWouldDoDifferently = dto.WhatIWouldDoDifferently,
            SubmittedAt = DateTime.UtcNow
        };

        route.Status = RouteStatus.Traveled;

        _context.TraveledRoutes.Add(traveledRoute);
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Trip record submitted.", RecordId = traveledRoute.Id });
    }
}
