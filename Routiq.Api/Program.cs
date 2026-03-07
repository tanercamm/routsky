using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel;
using Routiq.Api.Data;
using Routiq.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// ── CORS ──
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader());
});

// ── Database ──
builder.Services.AddDbContext<RoutiqDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IAuthService, AuthService>();

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
        modelId: "gemini-2.0-flash",
        apiKey: geminiKey);

// ── JWT Authentication ──
var key = System.Text.Encoding.ASCII.GetBytes(
    builder.Configuration["Jwt:Key"] ?? "SuperSecretKeyForDevelopmentOnly123!");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
})
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
    c.SwaggerDoc("v2", new Microsoft.OpenApi.Models.OpenApiInfo { Title = "Navisio API", Version = "v2" });
});

var app = builder.Build();

// ── V2 Database Seed ──
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<RoutiqDbContext>();
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

if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
