using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Routiq.Api.Entities;

/// <summary>
/// Extended profile for a registered user.
/// V2: Gamification points removed. Community loop is validation, not social scoring.
/// V2.1: PassportCountryCode replaced by Passports (multi-citizenship support).
/// </summary>
public class UserProfile
{
    public Guid Id { get; set; }

    public int UserId { get; set; }
    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    [Required, MaxLength(80)]
    public string Username { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// ISO 3166-1 alpha-2 passport country codes. Supports dual/multiple citizenship.
    /// Stored as a JSON array column by EF Core.
    /// e.g. ["TR", "DE"] for a Turkish-German dual citizen.
    /// </summary>
    public List<string> Passports { get; set; } = new() { "TR" };

    /// <summary>Preferred display currency for the UI (does not affect engine logic — engine uses USD).</summary>
    [MaxLength(3)]
    public string PreferredCurrency { get; set; } = "USD";

    /// <summary>ISO 3166-1 alpha-2 for emoji flag rendering in the UI (primary passport country).</summary>
    [MaxLength(3)]
    public string CountryCode { get; set; } = "TR";

    public int? Age { get; set; }

    [MaxLength(10)]
    public string Origin { get; set; } = string.Empty;

    /// <summary>Flight budget in USD. 0 = not set (engine uses $1500 default).</summary>
    public int Budget { get; set; } = 0;

    // ── Settings & Preferences ──
    [MaxLength(20)]
    public string UnitPreference { get; set; } = "Metric";

    [MaxLength(50)]
    public string TravelStyle { get; set; } = "Comfort";

    public bool NotificationsEnabled { get; set; } = true;
    public bool PriceAlertsEnabled { get; set; } = true;

    // Navigation
    public ICollection<SavedRoute> SavedRoutes { get; set; } = new List<SavedRoute>();
}
