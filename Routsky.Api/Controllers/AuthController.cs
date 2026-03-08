using System.Security.Claims;
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

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "avatars");
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

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

                var outputFileName = $"{Guid.NewGuid()}.webp";
                var outputPath = Path.Combine(uploadsFolder, outputFileName);
                await image.SaveAsWebpAsync(outputPath, new WebpEncoder { Quality = 80 });

                var avatarUrl = $"/uploads/avatars/{outputFileName}";

                var dbContext = HttpContext.RequestServices.GetRequiredService<Routsky.Api.Data.RoutskyDbContext>();
                var user = await dbContext.Users.FindAsync(userId);
                if (user == null) return NotFound("User not found");

                // Delete old avatar file if it exists
                if (!string.IsNullOrEmpty(user.AvatarUrl))
                {
                    var oldFile = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", user.AvatarUrl.TrimStart('/'));
                    if (System.IO.File.Exists(oldFile))
                        System.IO.File.Delete(oldFile);
                }

                user.AvatarUrl = avatarUrl;
                dbContext.Users.Update(user);

                // Dual persistence: Update UserProfile as well
                var profile = await dbContext.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
                if (profile != null)
                {
                    profile.ProfilePictureUrl = avatarUrl;
                    dbContext.UserProfiles.Update(profile);
                }

                await dbContext.SaveChangesAsync();

                return Ok(new { avatarUrl = user.AvatarUrl });
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

            if (!string.IsNullOrEmpty(user.AvatarUrl))
            {
                // Physical file deletion
                var fileName = Path.GetFileName(user.AvatarUrl);
                var physicalPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "avatars", fileName);

                if (System.IO.File.Exists(physicalPath))
                {
                    System.IO.File.Delete(physicalPath);
                }

                user.AvatarUrl = null;
                dbContext.Users.Update(user);
                await dbContext.SaveChangesAsync();
            }

            return Ok(new { avatarUrl = user.AvatarUrl });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
