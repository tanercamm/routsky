using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Routsky.Api.DTOs;
using Routsky.Api.Services;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace Routsky.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterRequestDto request)
    {
        try
        {
            var response = await _authService.RegisterAsync(request);
            return Ok(response);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginRequestDto request)
    {
        try
        {
            var response = await _authService.LoginAsync(request);
            return Ok(response);
        }
        catch (Exception ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpGet("social/{provider}")]
    public IActionResult SocialLogin(string provider)
    {
        var redirectUrl = Url.Action(nameof(SocialCallback), "Auth", new { provider });
        var properties = _authService.GetSocialAuthProperties(provider, redirectUrl!);
        return Challenge(properties, provider);
    }

    [HttpGet("callback/{provider}")]
    public async Task<IActionResult> SocialCallback(string provider)
    {
        var logger = HttpContext.RequestServices.GetRequiredService<ILogger<AuthController>>();
        try
        {
            logger.LogInformation("[SocialCallback] Starting callback for provider: {Provider}", provider);
            
            var result = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            if (!result.Succeeded)
            {
                logger.LogError("[SocialCallback] Authentication failed for scheme {Scheme}: {Failure}", CookieAuthenticationDefaults.AuthenticationScheme, result.Failure?.Message);
                return BadRequest(new { message = $"External authentication failed: {result.Failure?.Message}" });
            }

            logger.LogInformation("[SocialCallback] Provider authentication succeeded, calling HandleSocialAuthAsync");
            var response = await _authService.HandleSocialAuthAsync(result.Principal);
            logger.LogInformation("[SocialCallback] HandleSocialAuthAsync completed successfully for user: {UserId}", response.Id);
            
            // Production Redirect Only
            var userJson = System.Web.HttpUtility.UrlEncode(System.Text.Json.JsonSerializer.Serialize(response));
            return Redirect("https://routsky.com/auth/callback?token=" + response.Token + "&user=" + userJson);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[SocialCallback] EXCEPTION in SocialCallback for provider {Provider}: {Message}\\nStackTrace: {StackTrace}", provider, ex.Message, ex.StackTrace);
            return BadRequest(new { message = ex.Message, details = ex.StackTrace });
        }
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<AuthResponseDto>> GetMe()
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

            var response = await _authService.GetMeAsync(userId);

            // Explicitly map the URL
            var dbContext = HttpContext.RequestServices.GetRequiredService<Routsky.Api.Data.RoutskyDbContext>();
            var user = await dbContext.Users.FindAsync(userId);
            if (user != null)
            {
                 // Prefer embedded Base64, but keep URL for backwards compatibility
                 response.AvatarBase64 = user.AvatarBase64;
                 response.AvatarUrl = user.AvatarUrl;
            }

            return Ok(response);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<ActionResult<AuthResponseDto>> UpdateProfile([FromBody] UpdateProfileRequestDto request)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

            var response = await _authService.UpdateProfileAsync(userId, request);
            return Ok(response);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        { ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".heic", ".heif" };
    private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB

    [Authorize]
    [HttpPost("profile/avatar")]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file uploaded." });

            if (file.Length > MaxFileSizeBytes)
                return BadRequest(new { message = "File exceeds 10 MB limit." });

            var ext = Path.GetExtension(file.FileName);
            if (!AllowedExtensions.Contains(ext))
                return BadRequest(new { message = $"Unsupported format. Allowed: {string.Join(", ", AllowedExtensions)}" });

            // Read image into memory, resize and convert to WebP, then store as Base64 data URI
            using var inputStream = file.OpenReadStream();

            Image image;
            try
            {
                image = await Image.LoadAsync(inputStream);
            }
            catch (UnknownImageFormatException)
            {
                return BadRequest(new { message = "Cannot decode image. Supported: JPEG, PNG, WebP, GIF, BMP." });
            }

            using (image)
            {
                image.Mutate(x => x.Resize(new ResizeOptions
                {
                    Size = new SixLabors.ImageSharp.Size(512, 512),
                    Mode = ResizeMode.Crop
                }));

                await using var ms = new MemoryStream();
                await image.SaveAsWebpAsync(ms, new WebpEncoder { Quality = 80 });
                ms.Seek(0, SeekOrigin.Begin);
                var base64 = Convert.ToBase64String(ms.ToArray());
                var dataUri = $"data:image/webp;base64,{base64}";

                var dbContext = HttpContext.RequestServices.GetRequiredService<Routsky.Api.Data.RoutskyDbContext>();
                var user = await dbContext.Users.FindAsync(userId);
                if (user == null) return NotFound("User not found");

                // Clear any old physical avatar file (if present) to avoid orphaned files
                if (!string.IsNullOrEmpty(user.AvatarUrl))
                {
                    var oldFile = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", user.AvatarUrl.TrimStart('/'));
                    if (System.IO.File.Exists(oldFile))
                        System.IO.File.Delete(oldFile);
                }

                // Persist Base64 into the user/profile records
                user.AvatarBase64 = dataUri;
                // Keep AvatarUrl null to indicate we are using embedded images now
                user.AvatarUrl = null;
                dbContext.Users.Update(user);

                var profile = await dbContext.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
                if (profile != null)
                {
                    profile.ProfilePictureBase64 = dataUri;
                    profile.ProfilePictureUrl = null;
                    dbContext.UserProfiles.Update(profile);
                }

                await dbContext.SaveChangesAsync();

                return Ok(new { avatarBase64 = user.AvatarBase64 });
            }
        }
        catch (IOException ioEx)
        {
            return StatusCode(500, new { message = "Disk storage failure. Please check volume permissions.", details = ioEx.Message });
        }
        catch (DbUpdateException dbEx)
        {
            return StatusCode(500, new { message = "Database persistence failure.", details = dbEx.InnerException?.Message ?? dbEx.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Unexpected backend error during upload.", details = ex.Message });
        }
    }
    [Authorize]
    [HttpDelete("profile/avatar")]
    public async Task<IActionResult> RemoveAvatar()
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

            var dbContext = HttpContext.RequestServices.GetRequiredService<Routsky.Api.Data.RoutskyDbContext>();
            var user = await dbContext.Users.FindAsync(userId);
            if (user == null) return NotFound("User not found");

            // Delete any existing physical avatar file (if still present)
            if (!string.IsNullOrEmpty(user.AvatarUrl))
            {
                var fileName = Path.GetFileName(user.AvatarUrl);
                var physicalPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "avatars", fileName);

                if (System.IO.File.Exists(physicalPath))
                {
                    System.IO.File.Delete(physicalPath);
                }
            }

            // Clear both URL and embedded Base64 fields
            user.AvatarUrl = null;
            user.AvatarBase64 = null;
            dbContext.Users.Update(user);

            // Also clear profile's stored avatar (if present)
            var profile = await dbContext.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (profile != null)
            {
                profile.ProfilePictureUrl = null;
                profile.ProfilePictureBase64 = null;
                dbContext.UserProfiles.Update(profile);
            }

            await dbContext.SaveChangesAsync();

            return Ok(new { avatarUrl = user.AvatarUrl });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
