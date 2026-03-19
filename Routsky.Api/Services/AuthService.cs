using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Routsky.Api.Data;
using Routsky.Api.DTOs;
using Routsky.Api.Entities;

namespace Routsky.Api.Services;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request);
    Task<AuthResponseDto> LoginAsync(LoginRequestDto request);
    Task<AuthResponseDto> GetMeAsync(int userId);
    Task<AuthResponseDto> UpdateProfileAsync(int userId, UpdateProfileRequestDto request);
    Microsoft.AspNetCore.Authentication.AuthenticationProperties GetSocialAuthProperties(string provider, string redirectUrl);
    Task<AuthResponseDto> HandleSocialAuthAsync(ClaimsPrincipal principal);
    string GetFrontendRedirectUrl();
}

public class AuthService : IAuthService
{
    private readonly RoutskyDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(RoutskyDbContext context, IConfiguration configuration, ILogger<AuthService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request)
    {
        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
        {
            throw new Exception("User with this email already exists.");
        }

        var user = new User
        {
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = "User",
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var profile = new UserProfile
        {
            UserId = user.Id,
            Username = string.IsNullOrWhiteSpace(request.FirstName) ? request.Email.Split('@')[0] : request.FirstName,
            Email = request.Email,
            Passports = request.Passports != null && request.Passports.Any() ? request.Passports : new List<string> { "TR" },
            Origin = string.IsNullOrWhiteSpace(request.Origin)
                ? PassportHubResolver.Resolve(request.Passports?.FirstOrDefault() ?? "TR")
                : request.Origin
        };

        _context.UserProfiles.Add(profile);
        await _context.SaveChangesAsync();

        return GenerateAuthResponse(user, profile);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginRequestDto request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            throw new Exception("Invalid email or password.");
        }

        var profile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id);

        return GenerateAuthResponse(user, profile);
    }

    public async Task<AuthResponseDto> GetMeAsync(int userId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) throw new Exception("User not found.");

        var profile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);

        return GenerateAuthResponse(user, profile);
    }

    public async Task<AuthResponseDto> UpdateProfileAsync(int userId, UpdateProfileRequestDto request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) throw new Exception("User not found.");

        var profile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null)
        {
            profile = new UserProfile
            {
                UserId = userId,
                Username = string.IsNullOrWhiteSpace(user.FirstName) ? user.Email.Split('@')[0] : user.FirstName,
                Email = user.Email,
                Passports = request.Passports,
                Origin = string.IsNullOrWhiteSpace(request.Origin)
                    ? PassportHubResolver.Resolve(request.Passports?.FirstOrDefault() ?? "TR")
                    : request.Origin,
                PreferredCurrency = string.IsNullOrWhiteSpace(request.PreferredCurrency) ? "USD" : request.PreferredCurrency,
                UnitPreference = string.IsNullOrWhiteSpace(request.UnitPreference) ? "Metric" : request.UnitPreference,
                TravelStyle = string.IsNullOrWhiteSpace(request.TravelStyle) ? "Comfort" : request.TravelStyle,
                NotificationsEnabled = request.NotificationsEnabled,
                PriceAlertsEnabled = request.PriceAlertsEnabled
            };
            _context.UserProfiles.Add(profile);
        }
        else
        {
            profile.Passports = request.Passports;
            if (!string.IsNullOrWhiteSpace(request.Origin))
            {
                profile.Origin = request.Origin;
            }
            if (!string.IsNullOrWhiteSpace(request.PreferredCurrency))
            {
                profile.PreferredCurrency = request.PreferredCurrency;
            }
            if (!string.IsNullOrWhiteSpace(request.UnitPreference))
            {
                profile.UnitPreference = request.UnitPreference;
            }
            if (!string.IsNullOrWhiteSpace(request.TravelStyle))
            {
                profile.TravelStyle = request.TravelStyle;
            }
            // Update booleans directly
            profile.NotificationsEnabled = request.NotificationsEnabled;
            profile.PriceAlertsEnabled = request.PriceAlertsEnabled;
        }

        await _context.SaveChangesAsync();

        return GenerateAuthResponse(user, profile);
    }

    public Microsoft.AspNetCore.Authentication.AuthenticationProperties GetSocialAuthProperties(string provider, string redirectUrl)
    {
        return new Microsoft.AspNetCore.Authentication.AuthenticationProperties { RedirectUri = redirectUrl };
    }

    public async Task<AuthResponseDto> HandleSocialAuthAsync(ClaimsPrincipal principal)
    {
        _logger.LogInformation("[Social Auth] Starting HandleSocialAuthAsync");
        
        var email = principal.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrEmpty(email))
        {
            _logger.LogError("[Social Auth] Email not provided by social provider");
            throw new Exception("Email not provided by social provider.");
        }

        _logger.LogInformation("[Social Auth] Processing email: {Email}", email);
        
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        bool isNewUser = user == null;
        
        _logger.LogInformation("[Social Auth] User exists: {UserExists}, IsNewUser: {IsNewUser}", user != null, isNewUser);

        if (isNewUser)
        {
            var name = principal.FindFirstValue(ClaimTypes.Name) ?? principal.FindFirstValue(ClaimTypes.GivenName);
            var parts = name?.Split(' ', 2);
            
            _logger.LogInformation("[Social Auth] Creating new user with email: {Email}, name: {Name}", email, name ?? "(empty)");
            
            user = new User
            {
                Email = email,
                FirstName = parts?.Length > 0 ? parts[0] : "",
                LastName = parts?.Length > 1 ? parts[1] : "",
                PasswordHash = "OAUTH_LOGIN", // Placeholder for external users
                Role = "User",
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            _logger.LogInformation("[Social Auth] User saved to database with ID: {UserId}", user.Id);

            var profile = new UserProfile
            {
                UserId = user.Id,
                Username = email.Split('@')[0],
                Email = email,
                Passports = new List<string> { "TR" },
                Origin = "IST" // Default for Routsky
            };

            _context.UserProfiles.Add(profile);
            await _context.SaveChangesAsync();
            _logger.LogInformation("[Social Auth] UserProfile created for UserId: {UserId}", user.Id);
        }
        else
        {
            _logger.LogInformation("[Social Auth] User already exists: {UserId}", user!.Id);
        }

        _logger.LogInformation("[Social Auth] Fetching UserProfile for UserId: {UserId}", user!.Id);
        var userProfile = await _context.UserProfiles.FirstAsync(p => p.UserId == user!.Id);
        _logger.LogInformation("[Social Auth] UserProfile found, generating JWT token");
        
        var response = GenerateAuthResponse(user!, userProfile);
        _logger.LogInformation("[Social Auth] JWT token generated successfully for user: {Email}", email);
        
        return response;
    }

    public string GetFrontendRedirectUrl()
    {
        var url = _configuration["FrontendUrl"] ?? "https://routsky.com";
        _logger.LogInformation("[Social Auth] Frontend redirect URL: {FrontendUrl}", url);
        return url;
    }

    private AuthResponseDto GenerateAuthResponse(User user, UserProfile? profile)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var jwtKey = _configuration["Jwt:Key"];
        
        if (string.IsNullOrWhiteSpace(jwtKey))
        {
            _logger.LogError("[JWT Generation] CRITICAL: Jwt:Key is not configured. Using development fallback.");
            jwtKey = "SuperSecretKeyForDevelopmentOnly123!";
        }
        else
        {
            _logger.LogInformation("[JWT Generation] Jwt:Key is properly configured (length: {KeyLength})", jwtKey.Length);
        }
        
        var key = Encoding.ASCII.GetBytes(jwtKey);
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role)
            }),
            Expires = DateTime.UtcNow.AddDays(7),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        try
        {
            var token = tokenHandler.CreateToken(tokenDescriptor);
            _logger.LogInformation("[JWT Generation] Token created successfully for user: {UserId} ({Email})", user.Id, user.Email);
            return BuildAuthResponse(user, profile, token, tokenHandler);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[JWT Generation] FAILED to create token for user: {UserId} ({Email})", user.Id, user.Email);
            throw;
        }
    }

    private AuthResponseDto BuildAuthResponse(User user, UserProfile? profile, SecurityToken token, JwtSecurityTokenHandler tokenHandler)
    {
        var tokenString = tokenHandler.WriteToken(token);

        return new AuthResponseDto
        {
            Id = user.Id,
            Token = tokenString,
            Email = user.Email,
            Name = $"{user.FirstName} {user.LastName}".Trim(),
            Role = user.Role,
            AvatarUrl = user.AvatarUrl,
            AvatarBase64 = user.AvatarBase64,
            Passports = profile?.Passports ?? new List<string> { "TR" },
            Origin = profile?.Origin ?? "",
            PreferredCurrency = profile?.PreferredCurrency ?? "USD",
            UnitPreference = profile?.UnitPreference ?? "Metric",
            TravelStyle = profile?.TravelStyle ?? "Comfort",
            NotificationsEnabled = profile?.NotificationsEnabled ?? true,
            PriceAlertsEnabled = profile?.PriceAlertsEnabled ?? true
        };
    }
}
