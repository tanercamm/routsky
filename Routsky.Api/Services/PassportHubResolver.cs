namespace Routsky.Api.Services;

/// <summary>
/// Maps ISO 3166-1 alpha-2 passport country codes to their primary international hub airport (IATA).
/// Single source of truth — every origin-resolution path in the app must use this.
/// </summary>
public static class PassportHubResolver
{
    private static readonly Dictionary<string, string> HubMap = new(StringComparer.OrdinalIgnoreCase)
    {
        // Turkey & Caucasus
        ["TR"] = "IST",
        ["GE"] = "TBS",
        ["AZ"] = "GYD",
        ["AM"] = "EVN",

        // Western & Central Europe
        ["DE"] = "FRA",
        ["FR"] = "CDG",
        ["GB"] = "LHR",
        ["ES"] = "MAD",
        ["IT"] = "FCO",
        ["NL"] = "AMS",
        ["BE"] = "BRU",
        ["CH"] = "ZRH",
        ["AT"] = "VIE",
        ["PT"] = "LIS",
        ["IE"] = "DUB",
        ["SE"] = "ARN",
        ["NO"] = "OSL",
        ["DK"] = "CPH",
        ["FI"] = "HEL",

        // Eastern Europe & Balkans
        ["PL"] = "WAW",
        ["CZ"] = "PRG",
        ["HU"] = "BUD",
        ["RO"] = "OTP",
        ["BG"] = "SOF",
        ["RS"] = "BEG",
        ["HR"] = "ZAG",
        ["BA"] = "SJJ",
        ["SI"] = "LJU",
        ["SK"] = "BTS",
        ["UA"] = "KBP",
        ["GR"] = "ATH",
        ["AL"] = "TIA",
        ["ME"] = "TGD",
        ["MK"] = "SKP",
        ["XK"] = "PRN",

        // Asia-Pacific
        ["JP"] = "NRT",
        ["KR"] = "ICN",
        ["CN"] = "PVG",
        ["IN"] = "DEL",
        ["SG"] = "SIN",
        ["TH"] = "BKK",
        ["MY"] = "KUL",
        ["VN"] = "HAN",
        ["ID"] = "CGK",
        ["PH"] = "MNL",
        ["PK"] = "ISB",
        ["BD"] = "DAC",
        ["LK"] = "CMB",
        ["TW"] = "TPE",
        ["HK"] = "HKG",

        // Middle East
        ["AE"] = "DXB",
        ["QA"] = "DOH",
        ["SA"] = "RUH",
        ["IL"] = "TLV",
        ["JO"] = "AMM",
        ["LB"] = "BEY",
        ["KW"] = "KWI",
        ["BH"] = "BAH",
        ["OM"] = "MCT",
        ["IQ"] = "BGW",
        ["IR"] = "IKA",
        ["EG"] = "CAI",

        // Africa
        ["MA"] = "CMN",
        ["ZA"] = "JNB",
        ["NG"] = "LOS",
        ["KE"] = "NBO",
        ["TN"] = "TUN",
        ["DZ"] = "ALG",
        ["ET"] = "ADD",
        ["GH"] = "ACC",

        // Americas
        ["US"] = "JFK",
        ["CA"] = "YYZ",
        ["MX"] = "MEX",
        ["BR"] = "GRU",
        ["AR"] = "EZE",
        ["CO"] = "BOG",
        ["CL"] = "SCL",
        ["PE"] = "LIM",

        // Oceania
        ["AU"] = "SYD",
        ["NZ"] = "AKL",
    };

    /// <summary>
    /// Resolves a passport country code to its primary international hub IATA code.
    /// Returns "IST" as the absolute last-resort fallback.
    /// </summary>
    public static string Resolve(string? passportCode)
    {
        if (string.IsNullOrWhiteSpace(passportCode))
            return "IST";

        return HubMap.TryGetValue(passportCode.Trim(), out var hub) ? hub : "IST";
    }
}
