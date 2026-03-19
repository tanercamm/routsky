using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel;
using Routsky.Api.Data;
using Routsky.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);

// ── CORS ──
builder.Services.AddCors(options =>
{
    if (builder.Environment.IsProduction())
    {
        options.AddPolicy("AllowAll", policy =>
            policy.WithOrigins("https://routsky.com")
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials());
    }
    else
    {
        options.AddPolicy("AllowAll", policy =>
            policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader());
    }
});

// ── Database ──
builder.Services.AddDbContext<RoutskyDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IAuthService, AuthService>();

// ── In-Memory Cache ──
builder.Services.AddMemoryCache();

// ── Travel Buddy API (Visa) ──
builder.Services.AddHttpClient<TravelBuddyApiService>();
builder.Services.AddSingleton<TravelBuddyApiService>();

// ── Flight Price Providers (Hybrid: Turkish Airlines + Gemini) ──
builder.Services.AddHttpClient<TurkishAirlinesFlightPriceProvider>();
builder.Services.AddSingleton<TurkishAirlinesFlightPriceProvider>();
builder.Services.AddScoped<GeminiFlightPriceProvider>();
builder.Services.AddScoped<HybridFlightPriceService>();

// ── MCP Decision Services (Agent-as-Orchestrator) ──
builder.Services.AddScoped<RouteFeasibilityService>();
builder.Services.AddScoped<BudgetConsistencyService>();
builder.Services.AddScoped<TimeOverlapService>();
builder.Services.AddScoped<DecisionSolverService>();
builder.Services.AddHttpClient<AgentInsightService>();

// ── Semantic Kernel ──
var geminiKey = builder.Configuration["Gemini:ApiKey"];
if (string.IsNullOrWhiteSpace(geminiKey) || geminiKey == "mock-key")
    throw new InvalidOperationException(
        "FATAL: Gemini:ApiKey is not configured. Set the GEMINI_API_KEY environment variable or Gemini__ApiKey in your configuration.");

builder.Services.AddKernel()
    .AddGoogleAIGeminiChatCompletion(
        modelId: "gemini-2.5-flash",
        apiKey: geminiKey);

// ── JWT Authentication ──
var jwtKey = builder.Configuration["JwtSettings:Secret"] ?? builder.Configuration["Jwt:Key"];
if (builder.Environment.IsProduction() && string.IsNullOrWhiteSpace(jwtKey))
    throw new InvalidOperationException(
        "FATAL: JwtSettings:Secret is not configured. Set the JWT_SETTINGS__SECRET environment variable or JwtSettings__Secret in your configuration.");

var key = System.Text.Encoding.ASCII.GetBytes(
    jwtKey ?? "SuperSecretKeyForDevelopmentOnly123!");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
    options.DefaultSignInScheme = Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationDefaults.AuthenticationScheme;
})
.AddCookie() // Required for temporary social auth storage
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false
    };
})
.AddGoogle(options =>
{
    options.CallbackPath = "/api/Auth/callback/Google";
    options.ClientId = builder.Configuration["Authentication:Google:ClientId"] ?? "";
    options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"] ?? "";
    options.SignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;

    // Correlation cookie settings for both environments (strict for production)
    options.CorrelationCookie.SameSite = Microsoft.AspNetCore.Http.SameSiteMode.None;
    options.CorrelationCookie.SecurePolicy = Microsoft.AspNetCore.Http.CookieSecurePolicy.Always;
    options.CorrelationCookie.HttpOnly = true;

    // ── Production: Secure state cookie for cross-site OIDC flow ──
    if (builder.Environment.IsProduction())
    {
        options.Events.OnRedirectToAuthorizationEndpoint = context =>
        {
            // Ensure state cookie is secure and allows cross-site usage
            var correlationId = context.Request.Query["correlation_id"].ToString() ?? Guid.NewGuid().ToString();
            context.Response.Cookies.Append(
                ".AspNetCore.Correlation.Google",
                correlationId,
                new Microsoft.AspNetCore.Http.CookieOptions
                {
                    Secure = true,
                    SameSite = Microsoft.AspNetCore.Http.SameSiteMode.None,
                    HttpOnly = true
                });
            context.Response.Redirect(context.RedirectUri);
            return System.Threading.Tasks.Task.CompletedTask;
        };
    }
})
.AddGitHub(options =>
{
    options.CallbackPath = "/api/Auth/callback/GitHub";
    options.ClientId = builder.Configuration["Authentication:Github:ClientId"] ?? "";
    options.ClientSecret = builder.Configuration["Authentication:Github:ClientSecret"] ?? "";
    options.SignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;

    // Correlation cookie settings for both environments
    options.CorrelationCookie.SameSite = Microsoft.AspNetCore.Http.SameSiteMode.None;
    options.CorrelationCookie.SecurePolicy = Microsoft.AspNetCore.Http.CookieSecurePolicy.Always;
    options.CorrelationCookie.HttpOnly = true;
    
    // ── Request email scope from GitHub ──
    options.Scope.Add("user:email");
    
    // ── Manual email fetch if claim is missing ──
    options.Events.OnCreatingTicket = async context =>
    {
        var email = context.Principal?.FindFirstValue(ClaimTypes.Email)
                 ?? context.Principal?.FindFirstValue("urn:github:email");
        
        if (string.IsNullOrEmpty(email) && context.AccessToken is not null)
        {
            try
            {
                using var httpClient = new System.Net.Http.HttpClient();
                httpClient.DefaultRequestHeaders.Add("Authorization", $"token {context.AccessToken}");
                httpClient.DefaultRequestHeaders.Add("User-Agent", "Routsky");
                
                var response = await httpClient.GetAsync("https://api.github.com/user/emails");
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var emails = System.Text.Json.JsonDocument.Parse(json).RootElement.EnumerateArray();

                    var primaryEmail = emails.FirstOrDefault(e => e.GetProperty("primary").GetBoolean() && e.GetProperty("verified").GetBoolean())
                                              .GetProperty("email").GetString();

                    if (!string.IsNullOrEmpty(primaryEmail))
                    {
                        var claimsIdentity = (System.Security.Claims.ClaimsIdentity)context.Principal!.Identity!;
                        claimsIdentity.AddClaim(new System.Security.Claims.Claim(ClaimTypes.Email, primaryEmail));
                    }
                }
            }
            catch (Exception ex)
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogError(ex, "Failed to fetch email from GitHub API");
            }
        }
    };
});
// .AddApple(options =>
// {
//     options.ClientId = builder.Configuration["Authentication:Apple:ClientId"] ?? "";
//     options.TeamId = builder.Configuration["Authentication:Apple:TeamId"] ?? "";
//     options.KeyId = builder.Configuration["Authentication:Apple:KeyId"] ?? "";
//     options.PrivateKey = async (keyId, cancellationToken) =>
//     {
//         var privateKeyPath = builder.Configuration["Authentication:Apple:PrivateKey"] ?? "";
//         return await System.IO.File.ReadAllTextAsync(privateKeyPath, cancellationToken);
//     };
// });

// ── Cookie Policy (for cross-site OAuth flows) ──
builder.Services.Configure<Microsoft.AspNetCore.Builder.CookiePolicyOptions>(options =>
{
    options.CheckConsentNeeded = context => false;
    options.MinimumSameSitePolicy = Microsoft.AspNetCore.Http.SameSiteMode.Unspecified;
});

builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        // Allow React to send enum values as strings (e.g. "Budget", "SoutheastAsia")
        opts.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        opts.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v2", new Microsoft.OpenApi.Models.OpenApiInfo { Title = "Routsky API", Version = "v2" });
});

var app = builder.Build();

// ── Forwarded Headers (Unconditional for Proxy) ──
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedHost,
    RequireHeaderSymmetry = false,
    AllowedHosts = new[] { "routsky.com" }
});

// ── V2 Database Seed ──
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<RoutskyDbContext>();
        await DbInitializer.SeedAsync(context);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while seeding the V2 database.");
    }
}

// ── Pipeline ──
app.UseExceptionHandler(errApp =>
{
    errApp.Run(async ctx =>
    {
        ctx.Response.ContentType = "application/json";
        ctx.Response.StatusCode = 500;
        var feature = ctx.Features.Get<IExceptionHandlerFeature>();
        var correlationId = Guid.NewGuid().ToString("N")[..12];
        if (feature?.Error is not null)
        {
            var logger = ctx.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("GlobalExceptionHandler");
            logger.LogError(feature.Error, "Unhandled exception [{CorrelationId}]", correlationId);
        }
        await ctx.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            error = "Internal Server Error",
            correlationId,
            message = app.Environment.IsDevelopment() ? feature?.Error?.Message : "An unexpected error occurred."
        }));
    });
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseStaticFiles();
app.UseCookiePolicy();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }));

app.Run();
