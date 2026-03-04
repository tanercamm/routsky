using System.ComponentModel.DataAnnotations;

namespace Routiq.Api.DTOs;

public class LoginRequestDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public class RegisterRequestDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    public string Password { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public List<string>? Passports { get; set; }
    public string Origin { get; set; } = string.Empty;
}

public class AuthResponseDto
{
    public int Id { get; set; }
    public string Token { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public List<string> Passports { get; set; } = new();
    public string Origin { get; set; } = string.Empty;
    public string PreferredCurrency { get; set; } = string.Empty;
    public string UnitPreference { get; set; } = string.Empty;
    public string TravelStyle { get; set; } = string.Empty;
    public bool NotificationsEnabled { get; set; }
    public bool PriceAlertsEnabled { get; set; }
}

public class UpdateProfileRequestDto
{
    public List<string> Passports { get; set; } = new();
    public string Origin { get; set; } = string.Empty;
    public string PreferredCurrency { get; set; } = string.Empty;
    public string UnitPreference { get; set; } = string.Empty;
    public string TravelStyle { get; set; } = string.Empty;
    public bool NotificationsEnabled { get; set; }
    public bool PriceAlertsEnabled { get; set; }
}
