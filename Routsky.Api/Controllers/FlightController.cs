using Microsoft.AspNetCore.Mvc;
using Routsky.Api.Services;

namespace Routsky.Api.Controllers;

[ApiController]
[Route("api/flights")]
public class FlightController : ControllerBase
{
    private readonly RouteFeasibilityService _feasibility;

    public FlightController(RouteFeasibilityService feasibility)
    {
        _feasibility = feasibility;
    }

    /// <summary>
    /// Returns flight data for a given origin → destination, using the RouteFeasibilityService.
    /// If no origin is provided, resolves from passport via PassportHubResolver.
    /// </summary>
    [HttpGet("live")]
    public async Task<IActionResult> GetLiveFlight(
        [FromQuery] string destination,
        [FromQuery] string? origin = null,
        [FromQuery] string? passport = null)
    {
        if (string.IsNullOrWhiteSpace(destination))
            return BadRequest(new { message = "Destination is required" });

        var effectiveOrigin = !string.IsNullOrWhiteSpace(origin)
            ? origin
            : PassportHubResolver.Resolve(passport ?? "TR");
        var passports = !string.IsNullOrWhiteSpace(passport)
            ? new List<string> { passport }
            : new List<string> { "TR" };

        // Use the MCP Atom #1 for real flight estimation
        var result = await _feasibility.AnalyseAsync(
            effectiveOrigin,
            destination.ToUpperInvariant(),
            passports,
            destination.ToUpperInvariant());

        return Ok(new
        {
            flightNumber = $"TK {effectiveOrigin}-{destination.ToUpperInvariant()}",
            duration = result.FlightTimeFormatted,
            costUsd = result.EstimatedCostUsd,
            origin = effectiveOrigin,
            destination = destination,
            visaRequired = result.VisaRequired,
            visaType = result.VisaType,
            isFeasible = true,
            isEstimate = true,  // Always true until we have a live API integration
            source = "RouteFeasibilityService"
        });
    }
}
