using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Routiq.Api.Services;

namespace Routiq.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/agent")]
public class AgentProxyController : ControllerBase
{
    private readonly AgentInsightService _agentInsightService;

    public AgentProxyController(AgentInsightService agentInsightService)
    {
        _agentInsightService = agentInsightService;
    }

    [HttpGet("insight/{city}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetInsight(string city)
    {
        var insight = await _agentInsightService.GenerateInsightAsync(city);
        return Ok(new { text = insight });
    }
}
